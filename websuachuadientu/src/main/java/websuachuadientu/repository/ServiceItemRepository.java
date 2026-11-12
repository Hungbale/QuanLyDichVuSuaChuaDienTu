package websuachuadientu.repository;

import websuachuadientu.entity.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {

    @Query("""
        SELECT s FROM ServiceItem s
        WHERE (:keyword IS NULL OR :keyword = ''
               OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(s.serviceCode) LIKE LOWER(CONCAT('%', :keyword, '%')))
        AND (:status IS NULL OR :status = '' OR s.status = :status)
        AND (:categoryId IS NULL OR s.category.id = :categoryId)
        """)
    List<ServiceItem> search(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("categoryId") Long categoryId
    );

    boolean existsByServiceCode(String serviceCode);

    boolean existsByCategoryId(Long categoryId);

    Optional<ServiceItem> findTopByOrderByIdDesc();
}
