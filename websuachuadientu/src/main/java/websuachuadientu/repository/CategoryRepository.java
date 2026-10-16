package websuachuadientu.repository;

import websuachuadientu.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsByNameIgnoreCase(String name);

    List<Category> findByStatus(String status);
}
